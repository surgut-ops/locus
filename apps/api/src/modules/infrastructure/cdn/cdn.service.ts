export class CDNService {
  private readonly cdnBaseUrl: string | null;

  public constructor() {
    this.cdnBaseUrl =
      process.env.CDN_BASE_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? null;
  }

  public toDeliveryUrl(originUrl: string): string {
    if (!this.cdnBaseUrl) {
      return originUrl;
    }

    try {
      const parsed = new URL(originUrl);
      const path = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
      return `${this.cdnBaseUrl.replace(/\/+$/, '')}${path}`;
    } catch {
      if (originUrl.startsWith('/')) {
        return `${this.cdnBaseUrl.replace(/\/+$/, '')}${originUrl}`;
      }
      return `${this.cdnBaseUrl.replace(/\/+$/, '')}/${originUrl}`;
    }
  }
}
