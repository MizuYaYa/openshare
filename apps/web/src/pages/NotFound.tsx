import { Container, Heading, Link, Text } from "@yamada-ui/react";
import { Link as RLink } from "react-router";

export default function NotFound() {
  return (
    <Container as="main">
      <Heading>404 not found</Heading>
      <Text>ページが見つかりませんでした。URLが正しいか確認してください</Text>
      <Link as={RLink} to="/">
        ホームに戻る
      </Link>
    </Container>
  );
}
