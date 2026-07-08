# Marginal

Web đọc & học tiếng qua bài báo học thuật: dán bài báo (văn bản hoặc URL), dịch từng câu, hỏi AI về chủ đề liên quan, luyện viết (chấm chính tả/ngữ pháp), và luyện nghe–nói bằng giọng nói của trình duyệt.

## Kiến trúc

Vì đây là web tĩnh (deploy trên GitHub Pages), phần AI **không thể** gọi thẳng Gemini từ trình duyệt — API key sẽ bị lộ cho bất kỳ ai xem mã nguồn trang. Giải pháp: một Cloudflare Worker nhỏ đứng giữa, giữ key ở phía server.

```
Trình duyệt (GitHub Pages)  --->  Cloudflare Worker  --->  Gemini API
       frontend/                    worker/
```

Worker cũng giải quyết luôn việc tải nội dung từ URL bài báo — trình duyệt bị chặn bởi CORS khi fetch trực tiếp một trang báo bất kỳ, nhưng server thì không.

Tính năng nghe (đọc bài to lên) và nói (nhận diện giọng đọc theo) dùng Web Speech API có sẵn trong trình duyệt (Chrome/Edge) — miễn phí, không cần qua Worker.

## Cấu trúc thư mục

```
marginal/
  frontend/     # React + Vite + Tailwind — deploy lên GitHub Pages
  worker/       # Cloudflare Worker — deploy lên Cloudflare (có gói miễn phí)
```

## 1. Triển khai backend (Cloudflare Worker)

1. Tạo tài khoản Cloudflare miễn phí tại https://dash.cloudflare.com/sign-up
2. Cài đặt và đăng nhập:
   ```bash
   cd worker
   npm install
   npx wrangler login
   ```
3. Lấy Gemini API key miễn phí tại https://aistudio.google.com/apikey
4. Lưu key làm secret (không nằm trong code, không lộ ra Git):
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   # dán key vào khi được hỏi
   ```
5. Deploy:
   ```bash
   npx wrangler deploy
   ```
   Lệnh này in ra một URL dạng `https://marginal-api.<tên-bạn>.workers.dev` — copy lại URL này.

Muốn giới hạn chỉ cho trang GitHub Pages của bạn gọi được (an toàn hơn `*`), mở `wrangler.toml`, bỏ comment phần `[vars]` và điền domain GitHub Pages của bạn vào `ALLOWED_ORIGIN`, rồi deploy lại.

## 2. Triển khai frontend (GitHub Pages)

```bash
cd frontend
npm install
npm run build        # tạo thư mục dist/
```

Cách nhanh nhất để đưa `dist/` lên GitHub Pages, dùng gói `gh-pages` (đã có sẵn trong devDependencies):

```bash
npx gh-pages -d dist
```

Sau đó vào **Settings → Pages** của repo trên GitHub, chọn branch `gh-pages` làm nguồn. Trang sẽ chạy tại `https://<username>.github.io/<ten-repo>/`.

(Nếu muốn giống các dự án trước của bạn — build xong rồi push thủ công thư mục `dist` — cũng hoàn toàn được, chỉ cần đảm bảo `index.html` nằm đúng ở nhánh/thư mục Pages đọc.)

## 3. Kết nối frontend với backend

Mở trang đã deploy → tab **Cài đặt** → dán URL Worker từ bước 1 vào → Lưu. URL được lưu trong `localStorage` của trình duyệt, không cần build lại frontend mỗi lần đổi Worker.

## Chạy thử ở máy local (trước khi deploy)

```bash
# terminal 1
cd worker && npx wrangler dev      # chạy Worker ở http://localhost:8787

# terminal 2
cd frontend && npm run dev         # chạy frontend ở http://localhost:5173
```
Vào Cài đặt, dán `http://localhost:8787` làm Worker URL để test.

## Giới hạn hiện tại (biết trước để khỏi bất ngờ)

- **Tải bài từ URL**: dùng cách trích xuất nội dung khá cơ bản (không phải full Readability). Các trang chặn bot, có paywall, hoặc render nội dung bằng JavaScript (một số trang báo lớn) có thể tải thất bại — khi đó dán trực tiếp văn bản luôn là cách chắc chắn hoạt động.
- **Luyện nói**: so khớp dựa trên văn bản mà trình duyệt *nhận diện được* giọng bạn nói, không phải chấm điểm phát âm theo âm vị thật sự — dùng để luyện phản xạ đọc theo, không thay thế được giáo viên hoặc app chuyên về phát âm.
- **Nhận diện giọng nói (STT)** chỉ chạy ổn định trên Chrome/Edge; Firefox và một số trình duyệt khác không hỗ trợ.
- Worker dùng model `gemini-2.5-flash` mặc định (đổi qua biến `GEMINI_MODEL` trong `wrangler.toml` nếu Google đổi tên model — xem danh sách tại https://ai.google.dev/gemini-api/docs/models).

## Vài hướng phát triển tiếp (khi bạn có thời gian)

Các app đọc-để-học như LingQ/ReadLang thường xây quanh vài ý cốt lõi mà Marginal hiện chưa có, có thể thêm dần:

- **Đánh dấu từ đã biết/chưa biết**: tô màu từng từ trong bài theo mức độ quen thuộc, giúp mắt tự nhận ra từ mới khi đọc.
- **Sổ từ vựng + ôn tập ngắt quãng (spaced repetition)**: lưu lại các câu đã tra cứu ở mục Chú thích thành thẻ ôn tập.
- **Thư viện bài đã đọc**: lưu lịch sử bài báo đã mở (hiện tại mất khi tải lại trang, vì chưa có nơi lưu trữ).
- **Chấm điểm phát âm thật sự**: cần một API chuyên biệt (ví dụ Azure Pronunciation Assessment) thay vì chỉ so khớp văn bản nhận diện được.

Không cần làm hết một lúc — kiến trúc hiện tại (component tách rời theo từng tab) là để thêm từng tính năng một mà không đụng vào phần còn lại.
