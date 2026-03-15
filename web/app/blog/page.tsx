import Link from "next/link";
import { getAllContent } from "@/lib/content";
import styles from "./page.module.css";

export const metadata = { title: "Blog" };

export default function BlogIndex() {
  const posts = getAllContent("blog").sort((a, b) => {
    const da = a.meta.date ?? "";
    const db = b.meta.date ?? "";
    return db.localeCompare(da);
  });

  return (
    <div className={styles.page}>
      <h1>Blog</h1>
      <ul className={styles.postList}>
        {posts.map((post) => (
          <li key={post.slug} className={styles.postItem}>
            <Link href={`/blog/${post.slug}`} className={styles.postLink}>
              <div className={styles.postTitle}>{post.meta.title}</div>
              <div className={styles.postMeta}>
                {post.meta.date && <span>{post.meta.date}</span>}
                {post.meta.description && <span>{post.meta.description}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
