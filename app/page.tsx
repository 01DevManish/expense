import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">EURUS LIFESTYLE</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/admin" className="rounded-xl bg-white p-5 shadow text-center"><p className="text-xl font-semibold">Admin Panel</p></Link>
        <Link href="/shop" className="rounded-xl bg-white p-5 shadow text-center"><p className="text-xl font-semibold">Shop Panel</p></Link>
      </div>
    </div>
  );
}
