import View from './view';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }) {
  const sp = (await searchParams) || {};
  return <View query={sp} params={{}} />;
}