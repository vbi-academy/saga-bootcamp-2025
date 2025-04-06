"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Layout, Menu } from "antd";

const { Header, Content } = Layout;

export default function Home() {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState("mint-token");

  const handleMenuClick = ({ key }: { key: string }) => {
    setSelectedKey(key);
    router.push(`/${key}`);
  };

  return (
    <Layout style={{ minHeight: "100vh", padding: "20px" }}>
      {/* Header with Navigation */}
      <Header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            { key: "mint-token", label: "Mint Token" },
            { key: "mint-nft", label: "Mint NFT" },
            { key: "assets-vault-manager", label: "Assets Vault Manager" },
          ]}
        />
        <ConnectButton />
      </Header>

      {/* Content */}
      <Content style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginTop: "40px" }}>
        <h2>Welcome to Web3 Asset Manager</h2>
      </Content>
    </Layout>
  );
}