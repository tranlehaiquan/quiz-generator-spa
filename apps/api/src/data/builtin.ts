export interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  tags: string[];
  questions: Question[];
}

export const BUILTIN_QUIZZES: Quiz[] = [
  {
    id: "builtin-frontend",
    title: "Kiến thức Web Cơ bản",
    description: "Kiểm tra kiến thức cơ bản của bạn về HTML, CSS và các khái niệm JavaScript cốt lõi.",
    tags: ["Lập trình Web", "HTML/CSS/JS"],
    questions: [
      {
        question: "Thẻ HTML5 nào được sử dụng để định nghĩa thông tin chân trang (footer)?",
        options: ["<bottom>", "<footer>", "<section>", "<end>"],
        answer: "<footer>",
        explanation: "Thẻ <footer> dùng để định nghĩa chân trang cho một tài liệu hoặc một phần, thường chứa thông tin tác giả, bản quyền hoặc thông tin liên hệ."
      },
      {
        question: "CSS viết tắt của cụm từ nào?",
        options: ["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"],
        answer: "Cascading Style Sheets",
        explanation: "CSS viết tắt của Cascading Style Sheets (Tập tin định kiểu theo tầng). Nó mô tả cách các phần tử HTML hiển thị trên màn hình, giấy hoặc các phương tiện khác."
      },
      {
        question: "Phương thức JS nào chuyển đổi một chuỗi JSON thành một đối tượng JavaScript?",
        options: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.convert()"],
        answer: "JSON.parse()",
        explanation: "JSON.parse() nhận vào một chuỗi JSON và chuyển đổi nó thành đối tượng JavaScript, ngược lại với JSON.stringify()."
      },
      {
        question: "Làm thế nào để chọn một phần tử có id 'demo' trong CSS?",
        options: [".demo", "#demo", "*demo", "demo"],
        answer: "#demo",
        explanation: "Ký tự '#' được dùng để chọn phần tử theo thuộc tính ID duy nhất, trong khi dấu '.' dùng cho thuộc tính Class."
      },
      {
        question: "Thuộc tính HTML nào chỉ định văn bản thay thế cho hình ảnh nếu hình ảnh không thể hiển thị?",
        options: ["title", "src", "alt", "longdesc"],
        answer: "alt",
        explanation: "Thuộc tính 'alt' cung cấp thông tin thay thế cho hình ảnh nếu người dùng vì lý do nào đó không thể xem được hình ảnh (ví dụ: kết nối mạng chậm, trình đọc màn hình)."
      }
    ]
  },
  {
    id: "builtin-javascript",
    title: "Làm chủ JavaScript Engine",
    description: "Tìm hiểu sâu về ngữ cảnh thực thi, closures, event loop, prototypes và phạm vi biến.",
    tags: ["JavaScript", "Nâng cao"],
    questions: [
      {
        question: "Kết quả của console.log(typeof null) là gì?",
        options: ["'null'", "'undefined'", "'object'", "'string'"],
        answer: "'object'",
        explanation: "Trong JavaScript, 'typeof null' trả về 'object'. Đây là một lỗi thiết kế lịch sử trong ngôn ngữ được giữ lại để đảm bảo tính tương thích ngược."
      },
      {
        question: "Phát biểu nào sau đây mô tả đúng nhất về 'Closure' trong JavaScript?",
        options: [
          "Một phương thức để đóng kết nối cơ sở dữ liệu.",
          "Sự kết hợp giữa một hàm được bao bọc cùng với tham chiếu đến môi trường từ vựng (lexical environment) xung quanh nó.",
          "Kỹ thuật đóng gói để ẩn hoàn toàn cấu trúc các biến.",
          "Một hàm không trả về giá trị gì nhưng làm thay đổi biến toàn cục."
        ],
        answer: "Sự kết hợp giữa một hàm được bao bọc cùng với tham chiếu đến môi trường từ vựng (lexical environment) xung quanh nó.",
        explanation: "Closure cho phép bạn truy cập vào phạm vi của hàm bên ngoài từ một hàm bên trong. Trong JavaScript, closures được tạo ra mỗi khi một hàm được định nghĩa."
      },
      {
        question: "Thứ tự thực thi của microtasks và macrotasks trong Event Loop là gì?",
        options: [
          "Macrotasks chạy trước, tiếp theo ngay lập tức là tất cả Microtasks trong cùng một chu kỳ.",
          "Tất cả Microtasks trong hàng đợi phải chạy xong hoàn toàn trước khi Macrotask tiếp theo được lấy ra.",
          "Chúng chạy xen kẽ nhau, cứ một Microtask rồi đến một Macrotask.",
          "Chúng chạy song song trên các luồng thực thi trình duyệt riêng biệt."
        ],
        answer: "Tất cả Microtasks trong hàng đợi phải chạy xong hoàn toàn trước khi Macrotask tiếp theo được lấy ra.",
        explanation: "Sau khi mỗi macrotask hoàn thành, engine sẽ kiểm tra hàng đợi microtask và thực thi TOÀN BỘ microtasks trong đó trước khi chuyển sang macrotask tiếp theo (như timers, network events)."
      },
      {
        question: "Chỉ thị 'use strict' ở đầu file script có tác dụng gì?",
        options: [
          "Yêu cầu trình duyệt chạy mã trong chế độ sandbox an toàn.",
          "Bắt buộc khai báo kiểu dữ liệu nghiêm ngặt cho biến.",
          "Áp dụng quy tắc phân tích cú pháp và xử lý lỗi nghiêm ngặt hơn, giúp phát hiện lỗi phổ biến như rò rỉ biến toàn cục.",
          "Vô hiệu hóa các tác vụ bất đồng bộ để tránh tranh chấp tài nguyên (race conditions)."
        ],
        answer: "Áp dụng quy tắc phân tích cú pháp và xử lý lỗi nghiêm ngặt hơn, giúp phát hiện lỗi phổ biến như rò rỉ biến toàn cục.",
        explanation: "'use strict' giúp viết code JavaScript an toàn hơn bằng cách chuyển các lỗi cú pháp âm thầm thành các lỗi runtime thực sự, ví dụ như gán giá trị cho biến chưa khai báo."
      }
    ]
  },
  {
    id: "builtin-space",
    title: "Vũ trụ & Thiên văn học",
    description: "Hành trình khám phá các hành tinh, cơ học quỹ đạo, ngôi sao và các hiện tượng vũ trụ kì thú.",
    tags: ["Thiên văn học", "Khoa học"],
    questions: [
      {
        question: "Hành tinh nào có kích thước gần nhất với Trái Đất?",
        options: ["Sao Hỏa", "Sao Kim", "Sao Thủy", "Sao Hải Vương"],
        answer: "Sao Kim",
        explanation: "Sao Kim thường được gọi là hành tinh sinh đôi của Trái Đất vì chúng có kích thước, khối lượng, mật độ, thành phần cấu tạo và trọng lực rất tương đồng."
      },
      {
        question: "Tuổi xấp xỉ của Vũ trụ là bao nhiêu?",
        options: ["4.5 tỷ năm", "13.8 tỷ năm", "20 tỷ năm", "800 triệu năm"],
        answer: "13.8 tỷ năm",
        explanation: "Dựa trên các quan sát bức xạ nền vi sóng vũ trụ và tốc độ giãn nở, vũ trụ được ước tính khoảng 13.8 tỷ năm tuổi."
      },
      {
        question: "Lực nào giữ các thiên hà liên kết với nhau?",
        options: ["Lực điện từ", "Lực hạt nhân mạnh", "Lực hấp dẫn", "Lực ly tâm"],
        answer: "Lực hấp dẫn",
        explanation: "Lực hấp dẫn là lực hút chủ đạo ở quy mô vũ trụ, giữ các ngôi sao, khí bụi và vật chất tối liên kết với nhau tạo thành cấu trúc thiên hà."
      },
      {
        question: "Hành tinh nào trong hệ Mặt Trời có nhiều mặt trăng nhất?",
        options: ["Sao Mộc", "Sao Thổ", "Sao Thiên Vương", "Sao Hải Vương"],
        answer: "Sao Thổ",
        explanation: "Sao Thổ có 146 mặt trăng đã được xác nhận, vượt qua Sao Mộc (95 mặt trăng), trở thành hành tinh có nhiều vệ tinh tự nhiên nhất hệ Mặt Trời."
      }
    ]
  }
];

export const SCAN_PRESETS = [
  {
    title: "OCR Scan: Địa lý Thế giới",
    description: "Các câu hỏi địa lý được trích xuất từ hình ảnh tài liệu tải lên của bạn.",
    tags: ["Địa lý", "OCR"],
    questions: [
      {
        question: "Sông nào dài nhất thế giới?",
        options: ["Sông Amazon", "Sông Nile", "Sông Dương Tử", "Sông Mississippi"],
        answer: "Sông Nile",
        explanation: "Sông Nile theo truyền thống được coi là con sông dài nhất thế giới với chiều dài khoảng 6,650 km, mặc dù một số nghiên cứu gần đây cho rằng sông Amazon có thể dài hơn."
      },
      {
        question: "Quốc gia nào có diện tích đất liền lớn nhất?",
        options: ["Canada", "Trung Quốc", "Hoa Kỳ", "Nga"],
        answer: "Nga",
        explanation: "Nga là quốc gia lớn nhất thế giới về diện tích, bao phủ hơn 17 triệu km vuông."
      },
      {
        question: "Thủ đô của nước Úc (Australia) là gì?",
        options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
        answer: "Canberra",
        explanation: "Canberra được chọn làm thủ đô vào năm 1908 như một sự thỏa hiệp giữa hai thành phố đối địch lớn nhất là Sydney và Melbourne."
      }
    ]
  },
  {
    title: "OCR Scan: Nguyên lý Sinh học",
    description: "Các câu hỏi sinh học tế bào được trích xuất từ ảnh chụp slide bài giảng của bạn.",
    tags: ["Sinh học", "OCR"],
    questions: [
      {
        question: "Bào quan nào được mệnh danh là nhà máy năng lượng của tế bào?",
        options: ["Nhân tế bào", "Ribosome", "Ty thể", "Bộ máy Golgi"],
        answer: "Ty thể",
        explanation: "Ty thể là bào quan màng kép tạo ra hầu hết năng lượng hóa học cần thiết để cung cấp cho các phản ứng sinh hóa của tế bào dưới dạng ATP."
      },
      {
        question: "Phân tử nào mang thông tin di truyền trong các sinh vật sống?",
        options: ["RNA", "DNA", "Protein", "Lipid"],
        answer: "DNA",
        explanation: "DNA (Axit Deoxyribonucleic) là phân tử mang thông tin di truyền hướng dẫn sự phát triển, hoạt động, sinh trưởng và sinh sản của tất cả sinh vật sống."
      },
      {
        question: "Sắc tố màu xanh lục nào đóng vai trò quan trọng trong quá trình quang hợp ở thực vật?",
        options: ["Carotenoid", "Diệp lục (Chlorophyll)", "Hemoglobin", "Anthocyanin"],
        answer: "Diệp lục (Chlorophyll)",
        explanation: "Diệp lục là sắc tố tạo nên màu xanh lá cây của thực vật, chịu trách nhiệm hấp thụ năng lượng ánh sáng dùng trong quá trình quang hợp."
      }
    ]
  }
];
