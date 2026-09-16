import { Redirect, useLocalSearchParams } from 'expo-router';

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Deep-link landing for external payment returns (astrolearn://payment/success
 * or <webBase>/payment/success). The in-app WebView flow already handles the
 * result inline; this screen only redirects back to the relevant page. The
 * success/failure MESSAGE itself is shown by PurchaseProvider (unlock overlay
 * or failure toast), which reacts to the same deep link.
 */
export default function PaymentSuccessRedirect() {
  const params = useLocalSearchParams();
  const target = readParam(params.target) ?? '';
  const kind = readParam(params.kind) ?? 'video';

  if (target) {
    const href =
      kind === 'category'
        ? `/category/${encodeURIComponent(target)}`
        : `/video/${encodeURIComponent(target)}`;
    return <Redirect href={href as any} />;
  }
  return <Redirect href={'/(tabs)' as any} />;
}
