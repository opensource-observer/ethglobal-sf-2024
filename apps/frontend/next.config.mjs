/** @type {import('next').NextConfig} */
const nextConfig = {
    ...(process.env.STATIC_EXPORT
    ? {
        // Options for static-export
        output: "export",
      }
    : {
      }
    ),
};

export default nextConfig;
