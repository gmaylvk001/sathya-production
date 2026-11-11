'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function OrderStatsIcons() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let intervalId;
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/order-stats`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch order stats:', err);
      }
    };

    fetchStats();
    intervalId = setInterval(fetchStats, 120000); // 2 minutes

    return () => clearInterval(intervalId);
  }, []);

  const wrapperStyles = "flex flex-col items-center gap-1";
  const boxStyles = "relative flex h-5 w-5 lg:h-8 lg:w-8 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-700";
  const badgeStyles = "absolute -top-2 left-1/2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white";
  const labelStyles = "hidden lg:block text-[9px] font-medium text-gray-500";
  const iconStyles = "h-4 w-4 lg:h-4 lg:w-4 text-gray-700";

  return (
    <>
      <div className="orders-icon-wrap relative">
        <Link href="/admin/Allorder" className={wrapperStyles} aria-label="Total Orders">
          <div className={boxStyles}>
            <svg className={iconStyles} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {stats?.total > 0 && (
              <span className={badgeStyles}>{stats.total}</span>
            )}
          </div>
          <span className={labelStyles}>Orders</span>
        </Link>
      </div>

      <div className="cancelled-icon-wrap relative">
        <Link href="/admin/order/cancel-order" className={wrapperStyles} aria-label="Cancelled Orders">
          <div className={boxStyles}>
            <svg className={iconStyles} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {stats?.cancelled > 0 && (
              <span className={badgeStyles}>{stats.cancelled}</span>
            )}
          </div>
          <span className={labelStyles}>Cancelled</span>
        </Link>
      </div>


    </>
  );
}
