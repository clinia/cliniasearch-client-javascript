import { createBrowserLocalStorageCache } from '@clinia/cache-browser-local-storage';
import { createFallbackableCache } from '@clinia/cache-common';
import { createInMemoryCache } from '@clinia/cache-in-memory';
import { destroy, version } from '@clinia/client-common';
import {
  createSearchClient,
  getRecordPosition,
  initIndex,
  multipleQueries,
  MultipleQueriesOptions,
  MultipleQueriesQuery,
  MultipleQueriesResponse,
  search,
  SearchClient as BaseSearchClient,
  SearchIndex as BaseSearchIndex,
  SearchOptions,
  SearchResponse,
} from '@clinia/client-search';
import { LogLevelEnum } from '@clinia/logger-common';
import { createConsoleLogger } from '@clinia/logger-console';
import { createBrowserXhrRequester } from '@clinia/requester-browser-xhr';
import { createUserAgent, RequestOptions } from '@clinia/transporter';

import { CliniaSearchOptions } from '../types';

export default function clinia(
  engineId: string,
  apiKey: string,
  options?: CliniaSearchOptions
): SearchClient {
  const commonOptions = {
    engineId,
    apiKey,
    timeouts: {
      connect: 1,
      read: 2,
      write: 30,
    },
    requester: createBrowserXhrRequester(),
    logger: createConsoleLogger(LogLevelEnum.Error),
    responsesCache: createInMemoryCache(),
    requestsCache: createInMemoryCache({ serializable: false }),
    hostsCache: createFallbackableCache({
      caches: [
        createBrowserLocalStorageCache({ key: `${version}-${engineId}` }),
        createInMemoryCache(),
      ],
    }),
    userAgent: createUserAgent(version).add({ segment: 'Browser' }),
  };

  return createSearchClient({
    ...commonOptions,
    ...options,
    methods: {
      search: multipleQueries,
      multipleQueries,
      destroy,
      initIndex: (base) => (indexName: string): SearchIndex => {
        return initIndex(base)(indexName, {
          methods: { search, getRecordPosition },
        });
      },
    },
  });
}

// eslint-disable-next-line functional/immutable-data
clinia.version = version;

export type SearchIndex = BaseSearchIndex & {
  readonly search: <TRecord>(
    query: string,
    requestOptions?: RequestOptions & SearchOptions
  ) => Readonly<Promise<SearchResponse<TRecord>>>;
  readonly getRecordPosition: (searchResponse: SearchResponse<{}>, id: string) => number;
};

export type SearchClient = BaseSearchClient & {
  readonly initIndex: (indexName: string) => SearchIndex;
  readonly search: <TRecord>(
    queries: readonly MultipleQueriesQuery[],
    requestOptions?: RequestOptions & MultipleQueriesOptions
  ) => Readonly<Promise<MultipleQueriesResponse<TRecord>>>;
  readonly multipleQueries: <TRecord>(
    queries: readonly MultipleQueriesQuery[],
    requestOptions?: RequestOptions & MultipleQueriesOptions
  ) => Readonly<Promise<MultipleQueriesResponse<TRecord>>>;
};

export * from '../types';
