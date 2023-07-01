import { GetStaticProps } from 'next';
import { useState } from 'react';

import { FiCalendar, FiUser } from 'react-icons/fi';

import Link from 'next/link';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { RichText } from 'prismic-dom';
import Head from 'next/head';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { getPrismicClient } from '../services/prismic';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const { next_page, results } = postsPagination || {};

  const [posts, setPosts] = useState<Post[]>(results);
  const [nextPage, setNextPage] = useState(next_page);
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) {
    return <h1>Carregando...</h1>;
  }

  const handleLoadMorePosts = async () => {
    if (currentPage !== 1 && nextPage === null) {
      return;
    }

    const response = await fetch(`${nextPage}`).then(response =>
      response.json()
    );

    setNextPage(response.next_page);
    setCurrentPage(response.page);

    const newPosts = response.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
        data: {
          title: RichText.asText(post.data.title),
          subtitle: post.data.subtitle,
        },
      };
    });

    setPosts([...posts, ...newPosts]);

    return {
      props: {
        postsPagination: {
          next_page: response.next_page,
          results: posts,
        },
      },
    };
  };

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts?.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a className={styles.post} onClick={() => setLoading(true)}>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <ul>
                  <li>
                    <FiCalendar />
                    {post.first_publication_date}
                  </li>
                  <li>
                    <FiUser />
                    {post.data.author}
                  </li>
                </ul>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button type="button" onClick={handleLoadMorePosts}>
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient({});
  const postsResponse = await prismic.getByType('publication', {
    pageSize: 4,
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
      data: {
        title: RichText.asText(post.data.title),
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  console.log('postsResponse', postsResponse);

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
