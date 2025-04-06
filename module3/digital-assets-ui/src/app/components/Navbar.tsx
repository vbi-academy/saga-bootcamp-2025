"use client";

import { Layout, Menu } from "antd";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const { Header } = Layout;

export default function Navbar() {
  const router = useRouter();

  return (
    <Header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
      <Menu
        mode="horizontal"
        defaultSelectedKeys={["mint-token"]}
        style={{ flex: 1, minWidth: 0 }}
        onClick={({ key }) => router.push(`/${key}`)}
        items={[
            { key: "mint-token", label: "Mint Token" },
            { key: "mint-nft", label: "Mint NFT" },
            { key: "assets-vault-manager", label: "Assets Vault Manager" },
        ]}
    />

      <ConnectButton />
    </Header>
  );
}