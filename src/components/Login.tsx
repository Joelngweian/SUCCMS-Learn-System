import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "./ui/tabs";
import { ArrowRight, Loader2, AlertCircle, BookOpen } from "lucide-react";

export function Login() {
  const { signIn, signUp } = useAuth();
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up State
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfo("");
    
    const { error: signInError } = await signIn(loginEmail, loginPassword);
    
    if (signInError) {
      setError(signInError.message);
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfo("");


    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }
    
    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(
      signupEmail, 
      signupPassword, 
      signupUsername, 
      signupFullName
    );

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
    } else {
      setInfo("Account created! Please check your email to verify your account before signing in.");
      setAuthMode('signin');
      setLoginEmail(signupEmail);
      setIsLoading(false);
    }
  };

  return (
    // 1. MAIN CONTAINER
    <div className="auth-light relative flex items-center justify-center min-h-screen overflow-hidden bg-gray-900">
      
      {/* 2. BACKGROUND IMAGE LAYER (Lighter Blur) */}
      <div 
        className="absolute inset-0 z-0"
        style={{ 
          backgroundImage: `url('/loginBackground.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // REDUCED BLUR: changed from 8px to 3px
          filter: 'blur(2px)', 
          transform: 'scale(1.02)'
        }}
      />

      <div className="absolute inset-0 z-0 bg-white/50" />

      {/* 4. LOGIN CARD LAYER */}
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/30 backdrop-blur-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            SUCCMS Learn
          </CardTitle>
          <CardDescription>
            {authMode === 'signin' 
              ? "Enter your credentials to access your account" 
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {info && (
              <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="signin">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="m@example.com" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required 
                  />
                </div>
                <Button className="w-full font-bold shadow-sm" type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                    <>
                      Sign In <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    placeholder="John Doe" 
                    value={signupFullName} 
                    onChange={(e) => setSignupFullName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    placeholder="johndoe" 
                    value={signupUsername} 
                    onChange={(e) => setSignupUsername(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>SUC Email</Label>
                  <Input 
                    type="email" 
                    placeholder="D240106B@sc.edu.my" 
                    value={signupEmail} 
                    onChange={(e) => setSignupEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input 
                      type="password" 
                      value={signupPassword} 
                      onChange={(e) => setSignupPassword(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm</Label>
                    <Input 
                      type="password" 
                      value={signupConfirmPassword} 
                      onChange={(e) => setSignupConfirmPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <Button className="w-full font-bold shadow-sm" type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
