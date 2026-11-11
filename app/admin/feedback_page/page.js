"use client";
import { useState, useEffect } from "react";
import FeedbackComponent from "../components/feedback_page/feedback_page";

// import ContactComponent from "../../../app/admin/components/contact/contact";


export default function Dashboard() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return (
    <div>
      
      <FeedbackComponent /> {/* Use the feedback component here */}
    </div>
  );
}
