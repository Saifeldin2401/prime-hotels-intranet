// Allow TypeScript to import JSON modules
declare module '*.json' {
  const value: any;
  export default value;
}

// Add Node.js process type
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
