import BlogAdminTool from "./BlogAdminTool";
import { isSuperAdmin } from "@/lib/admin-auth";
import { getPinConfig, listAdminCategories, listAdminDidYouKnow, listAdminPosts, listReactions } from "@/lib/blog";
import { availableProviders } from "@/lib/blog-ai";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const [posts, categories, didYouKnow, superadmin, pinConfig, popularity] = await Promise.all([
    listAdminPosts(),
    listAdminCategories(),
    listAdminDidYouKnow(),
    isSuperAdmin(),
    getPinConfig(),
    listReactions(),
  ]);
  return (
    <BlogAdminTool
      initialPosts={posts}
      initialCategories={categories}
      initialDidYouKnow={didYouKnow}
      providers={availableProviders()}
      isSuperAdmin={superadmin}
      initialPinConfig={pinConfig}
      popularity={popularity}
    />
  );
}
