import AuthClient from "./AuthClient";

export async function generateStaticParams() {
  return [
    { kindeAuth: "login" },
    { kindeAuth: "register" },
    { kindeAuth: "callback" },
    { kindeAuth: "logout" }
  ];
}

export default function AuthPage({ params }: { params: { kindeAuth: string } }) {
  return <AuthClient kindeAuth={params.kindeAuth} />;
} 