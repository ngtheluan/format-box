import BlogAdminTool from "./BlogAdminTool";
import { isSuperAdmin } from "@/lib/admin-auth";
import { listAdminCategories, listAdminDidYouKnow, listAdminPosts } from "@/lib/blog";
import { availableProviders } from "@/lib/blog-ai";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const [posts, categories, didYouKnow, superadmin] = await Promise.all([
    listAdminPosts(),
    listAdminCategories(),
    listAdminDidYouKnow(),
    isSuperAdmin(),
  ]);
  return (
    <BlogAdminTool
      initialPosts={posts}
      initialCategories={categories}
      initialDidYouKnow={didYouKnow}
      providers={availableProviders()}
      isSuperAdmin={superadmin}
    />
  );
}
