"use client";

import { WagmiProvider, createConfig, createStorage, cookieStorage } from "wagmi";
import { http } from "viem";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, Layout } from "antd";
import { Chain } from "viem/chains";
import Navbar from "./components/Navbar";

// ✅ Cấu hình mạng Arbitrum Sepolia
const myCustomChain: Chain = {
  id: 2743654233235000,
  name: "VBI Chainlet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://vbim-2743654233235000-1.jsonrpc.sagarpc.io"] } },
};

// ✅ Cấu hình Wagmi và RainbowKit
const queryClient = new QueryClient();
const config = createConfig({
  chains: [myCustomChain],
  transports: { [myCustomChain.id]: http() },
  connectors: [],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <Layout style={{ minHeight: "100vh" }}>
                <Navbar />
                <Layout.Content style={{ padding: "20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {children}
                </Layout.Content>
              </Layout>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}