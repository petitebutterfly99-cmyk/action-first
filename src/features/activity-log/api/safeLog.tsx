import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { activityStore } from "./activityStore";


/**
 * Wrap an action so we always log to the activity store. Performs the action
 * first; only writes the log if the action succeeds. If the log write fails,
 * we surface a non-blocking warning toast with a "Retry log update" action.
 * On successful retry, the warning is dismissed automatically.
 */
export function safeLog(
  toast: ReturnType<typeof useToast>["toast"],
  action: () => void,
  entry: Parameters<typeof activityStore.log>[0],
) {
  // 1. Perform the user-facing action. If it fails, do not log.
  action();

  // 2. Attempt log write (Supabase first, localStorage fallback). The store
  //    only commits in-memory after persistence, so a rejection here means
  //    no Activity Log entry exists yet.
  const tryWrite = (): Promise<boolean> =>
    activityStore.log(entry).then(
      () => true,
      () => false,
    );

  tryWrite().then((ok) => {
    if (ok) return;

    // 3. Show a non-blocking warning with a retry affordance.
    const t = toast({
      title: "Heads up",
      description: "Action completed, but Activity Log could not be updated.",
      variant: "destructive",
      duration: 10000,
      action: (
        <ToastAction
          altText="Retry log update"
          onClick={(e) => {
            e.preventDefault();
            tryWrite().then((retryOk) => {
              if (retryOk) {
                t.dismiss();
                toast({ title: "Activity Log updated", duration: 2500 });
              }
            });
          }}
        >
          Retry log update
        </ToastAction>
      ),
    });
  });
}
