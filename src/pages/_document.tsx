import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/images/citycircuit-favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/images/citycircuit-icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/citycircuit-icon.svg" />
        
        {/* Meta tags */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="description" content="Smart bus route optimization system for Mumbai's transportation network. Find optimal routes, analyze traffic patterns, and improve urban mobility with AI-powered insights." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="CityCircuit - Smart Bus Route Optimization" />
        <meta property="og:description" content="Smart bus route optimization system for Mumbai's transportation network. Find optimal routes, analyze traffic patterns, and improve urban mobility with AI-powered insights." />
        <meta property="og:image" content="/images/citycircuit-hero.svg" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="CityCircuit - Smart Bus Route Optimization" />
        <meta property="twitter:description" content="Smart bus route optimization system for Mumbai's transportation network. Find optimal routes, analyze traffic patterns, and improve urban mobility with AI-powered insights." />
        <meta property="twitter:image" content="/images/citycircuit-hero.svg" />
        
        {/* Preload important assets */}
        <link rel="preload" href="/images/citycircuit-logo.svg" as="image" type="image/svg+xml" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}