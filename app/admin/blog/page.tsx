import BlogAdminTool from "./BlogAdminTool";
import { listAdminPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  const posts = await listAdminPosts();
  return <BlogAdminTool initialPosts={posts} />;
}
