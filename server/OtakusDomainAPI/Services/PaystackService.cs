using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace OtakusDomainAPI.Services;

public interface IPaystackService
{
    Task<PaystackInitResponse?> InitializePaymentAsync(string email, decimal amountInNaira, string reference, string callbackUrl, object? metadata = null);
    Task<PaystackVerifyResponse?> VerifyTransactionAsync(string reference);
    bool VerifyWebhookSignature(string rawJsonBody, string paystackSignatureHeader);
}

public class PaystackInitResponse
{
    [JsonPropertyName("status")]
    public bool Status { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public PaystackInitData? Data { get; set; }
}

public class PaystackInitData
{
    [JsonPropertyName("authorization_url")]
    public string AuthorizationUrl { get; set; } = string.Empty;

    [JsonPropertyName("access_code")]
    public string AccessCode { get; set; } = string.Empty;

    [JsonPropertyName("reference")]
    public string Reference { get; set; } = string.Empty;
}

public class PaystackVerifyResponse
{
    [JsonPropertyName("status")]
    public bool Status { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public PaystackVerifyData? Data { get; set; }
}

public class PaystackVerifyData
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty; // "success"

    [JsonPropertyName("reference")]
    public string Reference { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public long AmountInKobo { get; set; }

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = string.Empty;

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "NGN";

    [JsonPropertyName("paid_at")]
    public DateTime? PaidAt { get; set; }
}

public class PaystackService : IPaystackService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly string _secretKey;

    public PaystackService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
        _secretKey = _config["Paystack:SecretKey"] ?? string.Empty;
        _httpClient.BaseAddress = new Uri("https://api.paystack.co/");
        _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _secretKey);
    }

    public async Task<PaystackInitResponse?> InitializePaymentAsync(string email, decimal amountInNaira, string reference, string callbackUrl, object? metadata = null)
    {
        long amountInKobo = (long)(amountInNaira * 100);

        var payload = new
        {
            email,
            amount = amountInKobo,
            reference,
            callback_url = callbackUrl,
            metadata
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync("transaction/initialize", content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new Exception($"Paystack init failed: {err}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<PaystackInitResponse>(json);
    }

    public async Task<PaystackVerifyResponse?> VerifyTransactionAsync(string reference)
    {
        var response = await _httpClient.GetAsync($"transaction/verify/{Uri.EscapeDataString(reference)}");
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<PaystackVerifyResponse>(json);
    }

    public bool VerifyWebhookSignature(string rawJsonBody, string paystackSignatureHeader)
    {
        if (string.IsNullOrWhiteSpace(paystackSignatureHeader)) return false;

        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_secretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawJsonBody));
        var computed = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();

        return computed.Equals(paystackSignatureHeader.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}