"use client";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { Chain, http } from "viem";
import { cookieStorage, createConfig, createStorage, WagmiProvider } from "wagmi";


const myChainlet: Chain = {
    id: 2741608569515000,
    name: "AVBI",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18},
    rpcUrls: {
        default: {
            http: ["https://avbi-2741608569515000-1.jsonrpc.testnet.sagarpc.io"]
        }
    }
}

const queryClient = new QueryClient();
const config = createConfig({
    chains: [myChainlet],
    transports: { [myChainlet.id]: http() },
    connectors: [],
    ssr: true,
    storage: createStorage({storage: cookieStorage})
});

export function Providers({children} : { children: React.ReactNode}) {
    return (
        <ConfigProvider>
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={config}>
                    <RainbowKitProvider>{children}</RainbowKitProvider>
                </WagmiProvider>
            </QueryClientProvider>
        </ConfigProvider>
    )
}