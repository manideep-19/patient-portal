import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-brand-soft text-brand flex items-center justify-center">
        <Search className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-ink">Page Not Found</h1>
      <p className="text-xs sm:text-sm text-ink-soft max-w-sm leading-relaxed">
        The requested screen or consultation does not exist or has been moved.
      </p>
      <div className="pt-2">
        <Link href="/home">
          <Button variant="primary" size="md">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Return to Patient Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
