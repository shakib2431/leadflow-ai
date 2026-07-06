import { useParams } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function TeamEmployeeRedirect() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (id) {
      navigate(`/hrms/v2/employees/${id}`);
    }
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  );
}
