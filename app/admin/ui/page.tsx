"use client";
import AdminHeader from "../AdminHeader";
import "../admin.css";
import {
  Accordion,
  AccordionItem,
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Divider,
  Drawer,
  Field,
  HStack,
  IconButton,
  Input,
  Kbd,
  Menu,
  Modal,
  Progress,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Tab,
  TabPanel,
  Tabs,
  TabsList,
  Textarea,
  Tooltip,
  VStack,
} from "@/components/ui";
import {
  IconBell,
  IconCheck,
  IconComponents,
  IconCopy,
  IconDots,
  IconDownload,
  IconEdit,
  IconLayoutGrid,
  IconMail,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

export default function UiDemo() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tab, setTab] = useState("account");
  const [radio, setRadio] = useState("card");
  const [checked, setChecked] = useState(true);
  const [sw, setSw] = useState(true);
  const [vol, setVol] = useState(60);
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div className="fx-scope fx-shell">
      <AdminHeader
        crumbs={[
          { label: "Dashboard", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
          { label: "UI Kit", current: true, icon: <IconComponents size={13} stroke={1.8} /> },
        ]}
      />
      <div className="fx-body" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>UI Kit</h1>
          <p style={{ fontSize: 13, opacity: 0.62, marginTop: 4 }}>
            Bộ component dùng chung — Button, Input, Modal, Tabs, và nhiều hơn.
          </p>
        </div>

        <VStack gap={36} style={{ marginTop: 20 }}>
          {/* BUTTONS */}
          <Section title="Buttons">
            <HStack wrap gap={10}>
              <Button variant="primary">Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" loading>
                Loading
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </HStack>
            <HStack wrap gap={10} style={{ marginTop: 12 }}>
              <Button size="sm" leftIcon={<IconDownload size={14} />}>
                Small
              </Button>
              <Button size="md" leftIcon={<IconDownload size={14} />}>
                Medium
              </Button>
              <Button size="lg" leftIcon={<IconDownload size={16} />}>
                Large
              </Button>
              <ButtonGroup attached>
                <Button variant="subtle">Left</Button>
                <Button variant="subtle">Middle</Button>
                <Button variant="subtle">Right</Button>
              </ButtonGroup>
              <HStack gap={4}>
                <IconButton aria-label="Copy" variant="ghost">
                  <IconCopy size={16} />
                </IconButton>
                <IconButton aria-label="Edit" variant="subtle">
                  <IconEdit size={16} />
                </IconButton>
                <IconButton aria-label="Delete" variant="danger">
                  <IconTrash size={16} />
                </IconButton>
                <IconButton aria-label="Notify" variant="primary" round>
                  <IconBell size={16} />
                </IconButton>
              </HStack>
            </HStack>
          </Section>

          {/* INPUTS */}
          <Section title="Form controls">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              <Field label="Email" required hint="We never share it">
                <Input type="email" placeholder="you@example.com" leftIcon={<IconMail size={16} />} />
              </Field>
              <Field label="Search" htmlFor="s">
                <Input
                  id="s"
                  placeholder="Search…"
                  leftIcon={<IconSearch size={16} />}
                  rightSlot={<Kbd size="sm">⌘K</Kbd>}
                />
              </Field>
              <Field label="Invalid" error="Must be a number">
                <Input value="abc" invalid readOnly />
              </Field>
              <Field label="Country">
                <Select
                  options={[
                    { value: "vn", label: "Vietnam" },
                    { value: "us", label: "United States" },
                    { value: "jp", label: "Japan" },
                  ]}
                  defaultValue="vn"
                />
              </Field>
              <Field label="Bio">
                <Textarea placeholder="Tell us about yourself…" />
              </Field>
              <Field label="Preferences">
                <VStack gap={8}>
                  <Checkbox
                    label="Email me"
                    description="Weekly digest"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  <Checkbox label="Push notifications" defaultChecked />
                  <Switch label="Dark mode" checked={sw} onChange={(e) => setSw(e.target.checked)} />
                </VStack>
              </Field>
              <Field label="Plan">
                <RadioGroup value={radio} onChange={setRadio}>
                  <Radio value="free" label="Free" description="0đ / tháng" />
                  <Radio value="card" label="Pro" description="99đ / tháng" />
                  <Radio value="team" label="Team" description="299đ / tháng" />
                </RadioGroup>
              </Field>
              <Field label={`Volume: ${vol}`}>
                <Slider
                  min={0}
                  max={100}
                  value={vol}
                  onChange={(e) => setVol(Number(e.currentTarget.value))}
                  showValue
                />
              </Field>
            </div>
          </Section>

          {/* FEEDBACK */}
          <Section title="Feedback">
            <VStack gap={10}>
              {showAlert && (
                <Alert tone="info" title="Có bản mới" onClose={() => setShowAlert(false)}>
                  Nhấn F5 để cập nhật.
                </Alert>
              )}
              <Alert tone="success" title="Đã lưu">
                Thay đổi đã được lưu.
              </Alert>
              <Alert tone="warning" title="Chú ý">
                Bạn còn 3 lượt miễn phí.
              </Alert>
              <Alert tone="danger" title="Có lỗi xảy ra">
                Không thể kết nối tới server.
              </Alert>
            </VStack>
            <Divider label="Progress & Spinner" />
            <VStack gap={12}>
              <Progress value={30} showLabel />
              <Progress value={70} tone="success" striped animated showLabel />
              <Progress value={0} indeterminate />
              <HStack gap={14}>
                <Spinner size="sm" tone="primary" />
                <Spinner size="md" tone="primary" />
                <Spinner size="lg" tone="primary" />
                <Skeleton width={120} height={16} />
                <Skeleton circle width={36} height={36} />
              </HStack>
            </VStack>
          </Section>

          {/* DATA */}
          <Section title="Data display">
            <HStack wrap gap={20} align="flex-start">
              <Card style={{ width: 280 }} variant="elevated">
                <CardHeader>
                  <CardTitle>Card elevated</CardTitle>
                  <CardDescription>With shadow</CardDescription>
                </CardHeader>
                <CardBody>Bất kỳ nội dung nào cũng vào đây.</CardBody>
                <CardFooter>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                  <Button size="sm">Save</Button>
                </CardFooter>
              </Card>
              <Card style={{ width: 280 }} interactive>
                <CardHeader>
                  <CardTitle>Interactive</CardTitle>
                  <CardDescription>Hover me</CardDescription>
                </CardHeader>
                <CardBody>
                  <HStack gap={8} wrap>
                    <Badge tone="primary">primary</Badge>
                    <Badge tone="success" variant="solid">
                      solid
                    </Badge>
                    <Badge tone="warning" variant="outline">
                      outline
                    </Badge>
                    <Badge tone="danger" variant="dot">
                      danger
                    </Badge>
                  </HStack>
                </CardBody>
              </Card>
              <Card style={{ width: 280 }} variant="solid">
                <HStack gap={12}>
                  <Avatar name="Luân Nguyễn" status="online" />
                  <Avatar name="Đại Trần" size="lg" />
                  <Avatar size="md" shape="square" name="AB" />
                </HStack>
                <div style={{ marginTop: 12 }}>
                  Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to search.
                </div>
              </Card>
            </HStack>
          </Section>

          {/* NAV */}
          <Section title="Navigation">
            <Tabs value={tab} onValueChange={setTab} variant="segment">
              <TabsList>
                <Tab value="account">Account</Tab>
                <Tab value="notif">Notifications</Tab>
                <Tab value="billing">Billing</Tab>
              </TabsList>
              <TabPanel value="account">Nội dung tab Account…</TabPanel>
              <TabPanel value="notif">Nội dung Notifications…</TabPanel>
              <TabPanel value="billing">Nội dung Billing…</TabPanel>
            </Tabs>
            <Divider />
            <Tabs defaultValue="a" variant="line">
              <TabsList>
                <Tab value="a">Line tabs</Tab>
                <Tab value="b">Another</Tab>
                <Tab value="c" disabled>
                  Disabled
                </Tab>
              </TabsList>
              <TabPanel value="a">Line-variant panel.</TabPanel>
              <TabPanel value="b">Second panel.</TabPanel>
            </Tabs>
            <Divider />
            <Accordion type="single" defaultValue="one">
              <AccordionItem value="one" title="Điều khoản sử dụng">
                Bằng cách sử dụng dịch vụ, bạn đồng ý với các điều khoản dưới đây.
              </AccordionItem>
              <AccordionItem value="two" title="Chính sách bảo mật">
                Chúng tôi không thu thập dữ liệu cá nhân.
              </AccordionItem>
              <AccordionItem value="three" title="Câu hỏi thường gặp">
                Xem trang FAQ để biết thêm chi tiết.
              </AccordionItem>
            </Accordion>
          </Section>

          {/* OVERLAYS */}
          <Section title="Overlays">
            <HStack gap={10} wrap>
              <Button onClick={() => setModal(true)}>Open Modal</Button>
              <Button variant="ghost" onClick={() => setDrawer(true)}>
                Open Drawer
              </Button>
              <Tooltip content="Copy to clipboard">
                <Button variant="subtle" leftIcon={<IconCopy size={14} />}>
                  Hover me
                </Button>
              </Tooltip>
              <Menu
                trigger={
                  <Button variant="ghost" leftIcon={<IconDots size={14} />}>
                    Actions
                  </Button>
                }
                items={[
                  { label: "Edit", icon: <IconEdit size={14} />, onClick: () => {} },
                  { label: "Copy", icon: <IconCopy size={14} />, onClick: () => {} },
                  { separator: true, label: "" },
                  { label: "Delete", icon: <IconTrash size={14} />, danger: true, onClick: () => {} },
                ]}
              />
            </HStack>
          </Section>
        </VStack>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Xác nhận xoá"
        description="Hành động này không thể hoàn tác."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>
              Huỷ
            </Button>
            <Button variant="danger" leftIcon={<IconCheck size={14} />} onClick={() => setModal(false)}>
              Xoá
            </Button>
          </>
        }
      >
        <p>Bạn có chắc muốn xoá mục này không?</p>
      </Modal>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Cài đặt" side="right">
        <VStack gap={16}>
          <Field label="Tên hiển thị">
            <Input placeholder="Luân" />
          </Field>
          <Field label="Email">
            <Input type="email" placeholder="you@x.com" />
          </Field>
          <Switch label="Nhận email marketing" />
        </VStack>
      </Drawer>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 14 }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
