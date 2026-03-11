import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {},
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/setup/:path*", "/ops/:path*"],
};