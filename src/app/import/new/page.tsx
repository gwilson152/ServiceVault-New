"use client";

import { useRouter } from "next/navigation";
import ImportWizard from "@/components/import/ImportWizard";


export default function NewImportPage() {
  const router = useRouter();

  const handleComplete = (configurationId: string) => {
    router.push(`/import/${configurationId}`);
  };

  const handleCancel = () => {
    router.push("/import");
  };

  return (
    <ImportWizard
      mode="create"
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}

