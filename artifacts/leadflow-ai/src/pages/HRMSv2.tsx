import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HRMSv2Page() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/hrms/v2/admin-dashboard"); }, []);
  return null;
}
