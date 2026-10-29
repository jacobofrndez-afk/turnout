# Instagram and Facebook connections

## Current delivery

Account → Your channels offers Instagram and Facebook, independently for each place. The implemented flow is: official provider authorization → account/Page choice → confirmation → status, check, change account, reconnect and local disconnect. The selection expires after ten minutes. Cancellation keeps the previous connection. All UI copy is English.

**Not activated:** no Meta application exists for this project yet. The current demo truthfully shows “Connection setup pending”. It does not simulate connected accounts. Automated tests exercise provider responses; actual OAuth consent and provider access still need to be tested with a configured app.

Connecting an account does not publish a post, buy ads, enable scheduling or import insights. Current campaign publishing stays manual. Existing public campaign routes cannot access these credentials.

## 1. Create and configure the Meta application

In [Meta for Developers](https://developers.facebook.com/apps/), create the application for the business that operates Turnout. Configure the use cases/products for **Instagram API with Instagram Login** and **Facebook Login for Business / Pages API**. Meta's dashboard and eligibility requirements can vary by app type; follow its current setup flow.

- Instagram: use the Instagram app ID and secret shown in the Instagram Login setup. Request only `instagram_business_basic`. A business or creator account is required; direct Instagram Login does **not** require a linked Facebook Page.
- Facebook: configure Login for Business to return a **user access token**, with `pages_show_list` and `pages_read_engagement`. Save the configuration ID. Turnout lists the Pages the authorizing person can access and stores only the selected Page token. Personal profiles are not publication channels.
- Add your test users/accounts to the app roles and satisfy Meta's tester acceptance steps before development testing. Access for other businesses requires the applicable App Review, Advanced Access and business verification; adding secrets alone does not grant that access.
- Provide genuine privacy policy and user data deletion information before submitting the app for review. Provider-wide deauthorization/data-deletion webhooks are not implemented in this slice; plan and validate those before a public launch. Local disconnect is implemented; the person can also revoke the application through Meta settings.

Official references: [Instagram API with Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login), [Facebook Pages access tokens](https://www.postman.com/meta/facebook/request/bqfxwbp/get-access-tokens-of-pages-you-manage), [Facebook API](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api).

## 2. Configure the server

Set the blank values in `.env.local` for development or the host's secret store in production; never use `NEXT_PUBLIC_` for credentials. `.env.example` lists the variable names. Do not send keys in chat or commit them.

| Variable | Value |
| --- | --- |
| `TURNOUT_PUBLIC_URL` | Canonical HTTPS origin, e.g. `https://app.example.com`, no path |
| `CHANNEL_TOKEN_KEY` | 32 random bytes encoded as 64 hexadecimal characters |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | Instagram Login credentials |
| `META_APP_ID`, `META_APP_SECRET` | Facebook app credentials |
| `META_LOGIN_CONFIG_ID` | Facebook Login for Business configuration ID, user token |
| `META_GRAPH_VERSION` | Pinned Graph API version; default `v25.0` |

Generate the encryption key locally with a cryptographic generator and store it privately. Keep a secure backup: changing this key makes saved tokens unreadable and requires reconnection. Do not reuse a Meta secret as the encryption key.

Register **exactly** these valid OAuth redirect URIs, substituting the canonical origin:

```text
https://app.example.com/api/channels/instagram/callback
https://app.example.com/api/channels/facebook/callback
```

Use the same HTTPS address in the browser. Secure host-only cookies deliberately prevent OAuth through the plain HTTP localhost preview. For development, use an HTTPS development deployment or tunnel with a stable registered origin; do not weaken cookie protection or put app secrets in the browser. Restart the server after setting environment variables. Configure the reverse proxy to pass the original `Origin` header and never log OAuth query strings or token exchange URLs.

## 3. Verify with real test accounts before enabling customers

1. Open Account, select a demo place, click Connect Instagram, authorize a professional test account, then confirm the returned account. Verify the exact username and Connected status.
2. Connect Facebook in that same private session, approve the required Page access, choose the intended Page and confirm it. Test a person managing several Pages, partial/declined permissions and an account with no eligible Pages.
3. Switch demo places: the previous place's connections must not appear. Open a different browser without the private session: neither place may disclose connected account data.
4. Cancel a connection and confirm the existing selection stays intact. Reconnect/change the account, check its status, then disconnect. Confirm that no post or ad was created.
5. Revoke access in Meta and run Check connection: Turnout must ask for reconnection. Test sign-out and recovery by connecting the same social identity again.
6. Verify app review requirements, rate limits, privacy/deletion handling and permission availability for a non-role user before production rollout.

## Isolation and operational limits

- Meta identity authenticates a private channel owner. An opaque 30-day `HttpOnly`, `Secure`, `SameSite=Lax`, host-only cookie identifies a hashed server session. A second provider can be linked only within that session; identities from different owners are never silently merged. Recover a session by connecting the same provider identity. There is no team invitation or email/password account system yet.
- All connection operations require the canonical same-origin POST and the private session, except starting OAuth. OAuth state is random, browser-bound, provider-bound, single-use and expires after ten minutes. Existing session binding is checked again after provider calls.
- Tokens and temporary account choices are encrypted with AES-256-GCM and bound to owner, place, provider and record purpose. Public merchant routes never read the private tables. No tokens are serialized into client props or selection options. Temporary records become unusable on expiry and are purged when a new connection starts.
- Disconnect deletes the selected local token and pending choices for this owner/place/provider; it does **not** revoke Meta-wide permissions for other places. Sign-out revokes this browser session, not all devices. Database backups may retain encrypted historical records according to the host's backup policy.
- Tokens are checked on explicit request. Known expiry or an invalid-token response prompts reconnect. Background refresh, webhooks, automatic posting and insight ingestion are not enabled. Network outages do not erase a saved connection. Account metadata is fetched at connection time and may require reconnecting after a provider-side rename.
- The app still has publicly editable demo DNA, offers and campaign settings. Private channel sessions protect account access only. Add authenticated business administration and authorization to all business writes before using this demo as a production business cockpit.
- The in-memory request limit assumes one process. A replicated production deployment needs a shared rate limiter and persistent protected database storage.

## Automated validation

`npm test` includes state binding/replay/expiry, owner and place isolation, token encryption/tamper resistance, selection validation, session rotation/conflicts/sign-out, cancellation, expired/revoked tokens, stale verification results, safe pagination, permission failures and request origin/body checks. Provider tests use local fixtures; they do not authorize or send anything to Meta.
