import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import Header from 'src/components/Header';
import { useState } from 'react';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { getPrismicClient } from '../../services/prismic';

interface Post {
  uid?: string;
  last_publication_date: string | null;
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
  preview: boolean;
  loading?: boolean;
}

export default function Post({
  post,
  navigation,
  preview,
  loading = true,
}: PostProps) {
  const router = useRouter();

  if (router.isFallback || loading) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post?.data?.content?.reduce(
    (total: number, contentItem) => {
      total += contentItem.heading.split(' ').length;

      const words = contentItem.body.map(item => item.text.split(' ').length);
      words.map(word => (total += word));
      return total;
    },
    0
  );

  const readTime = Math.ceil(totalWords / 200);

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  return (
    <>
      {/* <Header /> */}
      <img src={post.data.banner.url} alt="imagem" className={styles.banner} />
      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div className={styles.postTop}>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar />
                {formatedDate}
              </li>
              <li>
                <FiUser />
                {post.data.author}
              </li>
              <li>
                <FiClock />
                {`${readTime} min`}
              </li>
            </ul>
          </div>

          {post?.data?.content?.map(content => {
            return (
              <article key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  className={styles.postContent}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </article>
            );
          })}
        </div>

        <section
          className={`${styles.navigation} ${commonStyles.container} ${
            navigation?.prevPost.length === 0 && styles['navigation-next']
          }`}
        >
          {navigation?.prevPost.length > 0 && (
            <div>
              <h3>{navigation.prevPost[0].data.title}</h3>
              <Link href={`/post/${navigation.prevPost[0].uid}`}>
                <a>Post anterior</a>
              </Link>
            </div>
          )}

          {navigation?.nextPost.length > 0 && (
            <div>
              <h3>{navigation.nextPost[0].data.title}</h3>
              <Link href={`/post/${navigation.nextPost[0].uid}`}>
                <a>Próximo post</a>
              </Link>
            </div>
          )}
        </section>

        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a className={commonStyles.preview}>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths = async () => {
  const prismic = getPrismicClient({});
  const posts = await prismic.getByType('publication', {
    pageSize: 1,
  });

  const paths = await posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  let loading = true;
  const prismic = getPrismicClient({});
  const response = await prismic.getByUID('publication', String(params.slug));

  const prevPost = await prismic.getByType('publication', {
    pageSize: 1,
    after: response.id,
    orderings: 'document.first_publication_date',
  });

  const nextPost = await prismic.getByType('publication', {
    pageSize: 1,
    after: response.id,
    orderings: 'document.first_publication_date desc',
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: RichText.asText(response.data.title),
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  loading = false;

  return {
    props: {
      post,
      navigation: {
        prevPost:
          prevPost?.results?.map((post: Post) => {
            return {
              uid: post.uid,
              first_publication_date: post.first_publication_date,
              last_publication_date: post.last_publication_date,
              data: {
                title: RichText.asText(post.data.title),
                banner: {
                  url: post.data.banner.url,
                },
                author: post.data.author,
                content: post.data.content.map(content => {
                  return {
                    heading: content.heading,
                    body: [...content.body],
                  };
                }),
              },
            };
          }) || [],
        nextPost:
          nextPost?.results?.map((post: Post) => {
            return {
              uid: post.uid,
              first_publication_date: post.first_publication_date,
              last_publication_date: post.last_publication_date,
              data: {
                title: RichText.asText(post.data.title),
                banner: {
                  url: post.data.banner.url,
                },
                author: post.data.author,
                content: post.data.content.map(content => {
                  return {
                    heading: content.heading,
                    body: [...content.body],
                  };
                }),
              },
            };
          }) || [],
      },
      loading,
      preview,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
