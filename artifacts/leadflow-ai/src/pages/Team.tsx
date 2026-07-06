import { useEffect } from "react";
import { useLocation } from "wouter";

export default function TeamPage() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/team/employees"); }, []);
  return null;
}
