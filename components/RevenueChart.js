import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamically import ApexChart to avoid SSR issues
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const RevenueChart = () => {
  const [options] = useState({
    chart: {
      height: 264,
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      dropShadow: {
        enabled: true,
        top: 6,
        left: 0,
        blur: 4,
        color: '#000',
        opacity: 0.1,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      colors: ['#487FFF'],
      width: 3,
    },
    markers: {
      size: 0,
      strokeWidth: 3,
      hover: { size: 8 },
    },
    tooltip: {
      enabled: true,
      x: { show: true },
      y: { show: false },
      z: { show: false },
    },
    grid: {
      row: {
        colors: ['transparent', 'transparent'],
        opacity: 0.5,
      },
      borderColor: '#D1D5DB',
      strokeDashArray: 3,
    },
    yaxis: {
      labels: {
        formatter: (value) => `$${value}k`,
        style: { fontSize: '14px' },
      },
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      tooltip: { enabled: false },
      labels: {
        style: { fontSize: '14px' },
      },
      axisBorder: { show: false },
      crosshairs: {
        show: true,
        width: 20,
        stroke: { width: 0 },
        fill: {
          type: 'solid',
          color: '#487FFF40',
        },
      },
    },
  });

  const [series] = useState([
    {
      name: 'This month',
      data: [10, 20, 12, 30, 14, 35, 16, 32, 14, 25, 13, 28],
    },
  ]);

  return (
    <div className="bg-white p-4 shadow-md rounded">
      <ApexChart options={options} series={series} type="line" height={264} />
    </div>
  );
};

export default RevenueChart;
