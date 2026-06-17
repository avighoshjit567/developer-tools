import * as tls from "tls";

export interface SslResult {
  active: boolean;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  subject: string;
  error?: string;
}

export function checkSsl(domain: string): Promise<SslResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        active: false,
        issuer: "Unknown",
        validFrom: "",
        validTo: "",
        daysRemaining: 0,
        subject: domain,
        error: "Connection timeout",
      });
    }, 10000);

    try {
      const socket = tls.connect(
        {
          host: domain,
          port: 443,
          servername: domain,
          rejectUnauthorized: false,
          timeout: 10000,
        },
        () => {
          clearTimeout(timeout);
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_from) {
            resolve({
              active: false,
              issuer: "Unknown",
              validFrom: "",
              validTo: "",
              daysRemaining: 0,
              subject: domain,
              error: "No certificate found",
            });
            return;
          }

          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysRemaining = Math.ceil(
            (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          resolve({
            active: daysRemaining > 0,
            issuer: String(cert.issuer?.O || cert.issuer?.CN || "Unknown"),
            validFrom: new Date(cert.valid_from).toISOString().split("T")[0],
            validTo: validTo.toISOString().split("T")[0],
            daysRemaining: Math.max(0, daysRemaining),
            subject: String(cert.subject?.CN || domain),
          });
        }
      );

      socket.on("error", () => {
        clearTimeout(timeout);
        resolve({
          active: false,
          issuer: "Unknown",
          validFrom: "",
          validTo: "",
          daysRemaining: 0,
          subject: domain,
          error: "Connection failed",
        });
      });
    } catch {
      clearTimeout(timeout);
      resolve({
        active: false,
        issuer: "Unknown",
        validFrom: "",
        validTo: "",
        daysRemaining: 0,
        subject: domain,
        error: "Connection failed",
      });
    }
  });
}
