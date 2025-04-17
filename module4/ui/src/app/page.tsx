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
      <Content style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginTop: "40px" }}>
        <h2>Welcome to Saga Swap</h2>
      </Content>
    </Layout>
  );
}