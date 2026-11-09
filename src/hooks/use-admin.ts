import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";

export function useIsAdmin() {
  const { user, loading: userLoading } = useAuthUser();
  const query = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin");
    },
  });
  return {
    isAdmin: query.data === true,
    loading: userLoading || (!!user && query.isLoading),
  };
}
