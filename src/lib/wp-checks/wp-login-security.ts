export interface WpLoginSecurityResult {
  loginPageAccessible: boolean;
  loginPageStatus: number | null;
  xmlrpcEnabled: boolean;
  restApiUsersExposed: boolean;
  restApiUserCount: number;
  authorEnumerationExposed: boolean;
  registrationOpen: boolean;
  wpAdminRedirects: boolean;
}

async function fetchSafe(
  url: string,
  timeout = 8000,
  options?: RequestInit
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

export async function checkWpLoginSecurity(domain: string): Promise<WpLoginSecurityResult> {
  const result: WpLoginSecurityResult = {
    loginPageAccessible: false,
    loginPageStatus: null,
    xmlrpcEnabled: false,
    restApiUsersExposed: false,
    restApiUserCount: 0,
    authorEnumerationExposed: false,
    registrationOpen: false,
    wpAdminRedirects: false,
  };

  // --- Check wp-login.php accessibility ---
  const loginRes = await fetchSafe(`https://${domain}/wp-login.php`, 8000, {
    redirect: 'follow',
  });
  if (loginRes) {
    result.loginPageStatus = loginRes.status;
    if (loginRes.status === 200) {
      try {
        const body = await loginRes.text();
        if (body.includes('wp-login')) {
          result.loginPageAccessible = true;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // --- Check xmlrpc.php ---
  const xmlrpcBody =
    '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>';
  const xmlrpcRes = await fetchSafe(`https://${domain}/xmlrpc.php`, 8000, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xmlrpcBody,
    redirect: 'follow',
  });
  if (xmlrpcRes) {
    try {
      const body = await xmlrpcRes.text();
      if (body.includes('<methodResponse>')) {
        result.xmlrpcEnabled = true;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Check REST API users endpoint ---
  const usersRes = await fetchSafe(`https://${domain}/wp-json/wp/v2/users`, 8000, {
    redirect: 'follow',
  });
  if (usersRes && usersRes.status === 200) {
    try {
      const json = await usersRes.json() as unknown;
      if (Array.isArray(json)) {
        result.restApiUsersExposed = true;
        result.restApiUserCount = json.length;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Check author enumeration ---
  const authorRes = await fetchSafe(`https://${domain}/?author=1`, 8000, {
    redirect: 'manual',
  });
  if (authorRes) {
    const location = authorRes.headers.get('location') ?? '';
    if (/\/author\/[^/]+\/?/.test(location)) {
      result.authorEnumerationExposed = true;
    }
  }

  // --- Check open registration ---
  const registerRes = await fetchSafe(
    `https://${domain}/wp-login.php?action=register`,
    8000,
    { redirect: 'follow' }
  );
  if (registerRes && registerRes.status === 200) {
    try {
      const body = await registerRes.text();
      if (body.includes('Register')) {
        result.registrationOpen = true;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Check wp-admin redirect behaviour ---
  const wpAdminRes = await fetchSafe(`https://${domain}/wp-admin/`, 8000, {
    redirect: 'manual',
  });
  if (wpAdminRes) {
    const location = wpAdminRes.headers.get('location') ?? '';
    if (location.includes('wp-login')) {
      result.wpAdminRedirects = true;
    }
  }

  return result;
}
