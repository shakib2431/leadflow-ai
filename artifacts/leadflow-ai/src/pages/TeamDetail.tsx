import { useParams } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function TeamLegacyEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (id) navigate(`/team/employees/${id}`);
  }, [id, navigate]);

  return null;
}
