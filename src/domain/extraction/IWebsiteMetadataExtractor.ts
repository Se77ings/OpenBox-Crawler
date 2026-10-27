import type { CapturedPage } from './CapturedPage';
import type { WebsiteMetadata } from './WebsiteMetadata';

export interface IWebsiteMetadataExtractor {
  extract(page: CapturedPage): WebsiteMetadata;
}
