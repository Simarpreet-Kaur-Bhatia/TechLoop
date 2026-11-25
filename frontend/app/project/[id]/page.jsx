import View from './view';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }) {
  const pr = (await params) || {};
  const sp = (await searchParams) || {};
  return <View query={sp} params={pr} />;
}