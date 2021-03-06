import { MethodEnum, Request } from '@clinia/requester-common';
import nock from 'nock';

import { createNodeHttpRequester } from '../..';

const requester = createNodeHttpRequester();

const headers = {
  'content-type': 'application/json',
};

const timeoutRequest: Request = {
  url: 'missing-url-here',
  data: '',
  headers: {},
  method: 'GET',
  responseTimeout: 5,
  connectTimeout: 2,
};

const requestStub: Request = {
  url: 'https://clinia-dns.net/foo?x-clinia-header=foo',
  method: MethodEnum.Post,
  headers: {
    'Content-Type': 'application/json',
  },
  data: JSON.stringify({ foo: 'bar' }),
  responseTimeout: 2,
  connectTimeout: 1,
};

describe('status code handling', () => {
  it('sends requests', async () => {
    const body = JSON.stringify({ foo: 'bar' });

    nock('https://clinia-dns.net', { reqheaders: headers })
      .post('/foo')
      .query({ 'x-clinia-header': 'foo' })
      .reply(200, body);

    const response = await requester.send(requestStub);

    expect(response.content).toEqual(JSON.stringify({ foo: 'bar' }));
  });

  it('resolves status 200', async () => {
    const body = JSON.stringify({ foo: 'bar' });

    nock('https://clinia-dns.net', { reqheaders: headers })
      .post('/foo')
      .query({ 'x-clinia-header': 'foo' })
      .reply(200, body);

    const response = await requester.send(requestStub);

    expect(response.status).toBe(200);
    expect(response.content).toBe(body);
    expect(response.isTimedOut).toBe(false);
  });

  it('resolves status 300', async () => {
    const reason = 'Multiple Choices';

    nock('https://clinia-dns.net', { reqheaders: headers })
      .post('/foo')
      .query({ 'x-clinia-header': 'foo' })
      .reply(300, reason);

    const response = await requester.send(requestStub);

    expect(response.status).toBe(300);
    expect(response.content).toBe(reason);
    expect(response.isTimedOut).toBe(false);
  });

  it('resolves status 400', async () => {
    const body = { message: 'Invalid Engine-Id or API-Key' };

    nock('https://clinia-dns.net', { reqheaders: headers })
      .post('/foo')
      .query({ 'x-clinia-header': 'foo' })
      .reply(400, JSON.stringify(body));

    const response = await requester.send(requestStub);

    expect(response.status).toBe(400);
    expect(response.content).toBe(JSON.stringify(body));
    expect(response.isTimedOut).toBe(false);
  });
});

describe('timeout handling', () => {
  it('timeouts with the given 1 seconds connection timeout', async () => {
    const before = Date.now();
    const response = await requester.send({
      ...timeoutRequest,
      ...{ connectTimeout: 1, url: 'http://www.google.com:81' },
    });

    const now = Date.now();

    expect(response.content).toBe('Connection timeout');
    expect(now - before).toBeGreaterThan(999);
    expect(now - before).toBeLessThan(1200);
  });

  it('connection timeouts with the given 2 seconds connection timeout', async () => {
    const before = Date.now();
    const response = await requester.send({
      ...timeoutRequest,
      ...{ connectTimeout: 2, url: 'http://www.google.com:81' },
    });

    const now = Date.now();

    expect(response.content).toBe('Connection timeout');
    expect(now - before).toBeGreaterThan(1999);
    expect(now - before).toBeLessThan(2200);
  });

  it('socket timeouts if response dont appears before the timeout with 2 seconds timeout', async () => {
    const before = Date.now();

    const response = await requester.send({
      ...timeoutRequest,
      ...{ responseTimeout: 2, url: 'http://localhost:1111/' },
    });

    const now = Date.now();

    expect(now - before).toBeGreaterThan(1999);
    expect(now - before).toBeLessThan(2200);
    expect(response.content).toBe('Socket timeout');
  });

  it('socket timeouts if response dont appears before the timeout with 3 seconds timeout', async () => {
    const before = Date.now();
    const response = await requester.send({
      ...timeoutRequest,
      ...{
        responseTimeout: 3,
        url: 'http://localhost:1111',
      },
    });

    const now = Date.now();

    expect(response.content).toBe('Socket timeout');
    expect(now - before).toBeGreaterThan(2999);
    expect(now - before).toBeLessThan(3200);
  });

  it('do not timeouts if response appears before the timeout', async () => {
    const request = Object.assign({}, requestStub);
    const before = Date.now();
    const response = await requester.send({
      ...request,
      url: 'http://localhost:1111',
      responseTimeout: 6, // the fake server sleeps for 5 seconds...
    });

    const now = Date.now();

    expect(response.isTimedOut).toBe(false);
    expect(response.status).toBe(200);
    expect(response.content).toBe('{"foo": "bar"}');
    expect(now - before).toBeGreaterThan(4999);
    expect(now - before).toBeLessThan(5200);
  });

  it('can be destroyed', async () => {
    // Can be destroyed without being used.
    await expect(requester.destroy()).resolves.toBeUndefined();

    await requester.send({
      ...requestStub,
      url: 'http://localhost:1111',
      responseTimeout: 6, // the fake server sleeps for 5 seconds...
    });

    // Can be destroyed after being used.
    await expect(requester.destroy()).resolves.toBeUndefined();

    // Can be destroyed more than once.
    await expect(requester.destroy()).resolves.toBeUndefined();

    // Can perform requests after being destroyed
    await requester.send({
      ...requestStub,
      url: 'http://localhost:1111',
      responseTimeout: 6, // the fake server sleeps for 5 seconds...
    });
  });
});

describe('error handling', (): void => {
  it('resolves dns not found', async () => {
    const request = {
      url: 'https://this-dont-exist.clinia.com',
      method: MethodEnum.Post,
      headers: {
        'X-Clinia-Engine-Id': 'ABCDE',
        'X-Clinia-API-Key': '12345',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ foo: 'bar' }),
      responseTimeout: 2,
      connectTimeout: 1,
    };

    const response = await requester.send(request);

    expect(response.status).toBe(0);
    expect(response.content).toContain('');
    expect(response.isTimedOut).toBe(false);
  });

  it('resolves general network errors', async () => {
    nock('https://clinia-dns.net', { reqheaders: headers })
      .post('/foo')
      .query({ 'x-clinia-header': 'foo' })
      .replyWithError('This is a general error');

    const response = await requester.send(requestStub);

    expect(response.status).toBe(0);
    expect(response.content).toBe('This is a general error');
    expect(response.isTimedOut).toBe(false);
  });
});
