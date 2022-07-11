interface HttpRequest {
  url: string;
  headers: { [key: string]: string; }
}

export default HttpRequest;
