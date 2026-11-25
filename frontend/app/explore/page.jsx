import View from './view';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const sp = (await searchParams) || {};
  const plain = {};
  for (const k of Object.keys(sp)) plain[k] = Array.isArray(sp[k]) ? sp[k][0] : String(sp[k]);
  return <View key={JSON.stringify(plain)} query={plain} params={{}} />;
}