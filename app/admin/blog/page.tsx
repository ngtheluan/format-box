import BlogAdminTool from "./BlogAdminTool";
import { listAdminCategories, listAdminPosts } from "@/lib/blog";
import { availableProviders } from "@/lib/blog-ai";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const [posts, categories] = await Promise.all([listAdminPosts(), listAdminCategories()]);
  return <BlogAdminTool initialPosts={posts} initialCategories={categories} providers={availableProviders()} />;
}
