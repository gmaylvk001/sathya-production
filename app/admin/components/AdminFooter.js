"use client";
import { useEffect, useState } from "react";

const AdminFooter = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return (
    <footer className="bg-gray-900 text-white p-4 text-center">
      <p>Admin Footer</p>
      {/* <script src="../assets/libs/@popperjs/core/umd/popper.min.js"></script>
        <script src="../assets/libs/simplebar/simplebar.min.js"></script>
        <script src="../assets/libs/feather-icons/feather.min.js"></script>
        <script src="../assets/js/pages/components.js"></script>

        <script src="../assets/libs/jsvectormap/js/jsvectormap.min.js"></script>
        <script src="../assets/libs/jsvectormap/maps/world.js"></script>
        <script src="../assets/libs/chart.js/chart.min.js"></script>    
        <script src="../assets/libs/echarts/echarts.min.js"></script>
        <script src="../assets/libs/apexcharts/apexcharts.min.js"></script>
        <script src="../assets/js/pages/analytics-index.init.js"></script>
        <script src="../assets/js/app.js"></script> */}
    </footer>
    
  );
};

export default AdminFooter;
