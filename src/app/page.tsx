import LoginPage from "./login/page";
import SignupPage from "./signup/page";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <LoginPage />
      </div>
    </main>
  );
}
