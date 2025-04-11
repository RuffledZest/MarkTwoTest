import React from "react";

export async function generateStaticParams() {
  return [
    { slug: "getting-started" },
    { slug: "github-sync" },
    { slug: "private-files" },
    { slug: "archive" }
  ];
}

const page = () => {
  return <div>page</div>;
};

export default page;
