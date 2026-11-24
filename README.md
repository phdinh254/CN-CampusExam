# CampusExam

Hệ thống thi trắc nghiệm tập trung tại phòng máy: quản lý ngân hàng câu hỏi (nhập từ Word),
ma trận đề, kỳ thi và phòng thi cho thí sinh.

- Backend: ASP.NET Core (.NET 10), EF Core, SQL Server
- Frontend: React 19, Vite, TypeScript

## Chạy dự án

Tạo database:

```
sqlcmd -S localhost -E -C -f 65001 -i database/CampusExamDB.sql
```

Backend:

```
cd backend
dotnet user-secrets set "ConnectionStrings:CampusExam" "Server=localhost;Database=CampusExam;Integrated Security=True;TrustServerCertificate=True"
dotnet user-secrets set "Auth:SigningKey" "<chuỗi ngẫu nhiên tối thiểu 32 ký tự>"
dotnet run -- bootstrap-admin --ten-dn admin --ho-ten "Quản trị viên"
dotnet run --launch-profile https
```

Frontend:

```
cd frontend
npm install
npm run dev
```
