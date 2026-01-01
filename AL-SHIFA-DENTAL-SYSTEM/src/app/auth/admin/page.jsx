import AuthLayout from "@/components/AuthLayout";
import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";

export default function AdminLoginPage() {
  return (
    <AuthLayout
      title="Admin Login"
      subtitle="Restricted access. Authorized personnel only."
    >
      <InputField label="Admin Email" type="email" required />
      <InputField label="Password" type="password" required />
      <PrimaryButton>Login</PrimaryButton>
    </AuthLayout>
  );
}
