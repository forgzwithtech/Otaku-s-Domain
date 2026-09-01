using System.Net;
using System.Net.Mail;

namespace OtakusDomainAPI.Services;

public interface IEmailService
{
    Task SendTicketPassEmailAsync(string recipientEmail, string recipientName, string eventTitle, string stageName, Guid ticketId, DateTime eventDate, string venue);
    Task SendPresaleConfirmationEmailAsync(string recipientEmail, string recipientName, string eventTitle, decimal discountLocked, decimal paidAmount);
    Task SendStoreOrderReceiptEmailAsync(string recipientEmail, string recipientName, string orderNumber, decimal totalAmount, decimal deliveryFee, string shippingAddress, string akureZone, string itemsSummary);
    Task SendStoreDeliveryUpdateEmailAsync(string recipientEmail, string recipientName, string orderNumber, string statusHeadline, string customNote, string shippingAddress, string akureZone, string? riderContact);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    private SmtpClient GetSmtpClient()
    {
        var host = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var port = int.Parse(_config["Smtp:Port"] ?? "587");
        var user = _config["Smtp:User"] ?? string.Empty;
        var pass = _config["Smtp:Pass"] ?? string.Empty;

        return new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(user, pass),
            EnableSsl = true
        };
    }

    public async Task SendTicketPassEmailAsync(string recipientEmail, string recipientName, string eventTitle, string stageName, Guid ticketId, DateTime eventDate, string venue)
    {
        try
        {
            using var client = GetSmtpClient();
            var from = new MailAddress(_config["Smtp:User"] ?? "command@otakusdomain.com", "Otaku's Domain Interpool");
            var to = new MailAddress(recipientEmail, recipientName);

            var qrCodeApiUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={ticketId}";

            var body = $@"
            <div style=""font-family: 'Courier New', monospace; background-color: #e8e4d8; padding: 24px; color: #000;"">
                <div style=""max-width: 520px; margin: 0 auto; background: #fff; border: 4px solid #000; padding: 24px; box-shadow: 8px 8px 0px #000;"">
                    <span style=""background: #000; color: #facc15; padding: 4px 8px; font-weight: 900; font-size: 11px; text-transform: uppercase;"">OFFICIAL GATE ACCESS PASS</span>
                    <h1 style=""font-size: 28px; text-transform: uppercase; margin: 12px 0 4px 0; font-weight: 900;"">{eventTitle}</h1>
                    <p style=""font-size: 14px; font-weight: bold; margin: 0 0 16px 0;"">TIER: {stageName} | GUEST: {recipientName}</p>
                    
                    <div style=""text-align: center; margin: 20px 0; padding: 16px; border: 2px dashed #000; background: #fafafa;"">
                        <img src=""{qrCodeApiUrl}"" alt=""Gate QR Code"" style=""width: 200px; height: 200px; border: 2px solid #000;"" />
                        <p style=""font-size: 10px; font-weight: bold; margin-top: 8px; word-break: break-all;"">PASS-UUID: {ticketId}</p>
                    </div>

                    <div style=""font-size: 12px; font-weight: bold; line-height: 1.6;"">
                        <p>📍 <strong>VENUE:</strong> {venue}</p>
                        <p>📅 <strong>DATE:</strong> {eventDate:f} (UTC)</p>
                        <p style=""color: #dc2626;"">⚠️ Present this QR at the gate terminal for verification.</p>
                    </div>
                </div>
            </div>";

            var mail = new MailMessage(from, to)
            {
                Subject = $"[PASS AUTHORIZED] Your Ticket for {eventTitle}",
                Body = body,
                IsBodyHtml = true
            };

            await client.SendMailAsync(mail);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email Error]: {ex.Message}");
        }
    }

    public async Task SendPresaleConfirmationEmailAsync(string recipientEmail, string recipientName, string eventTitle, decimal discountLocked, decimal paidAmount)
    {
        try
        {
            using var client = GetSmtpClient();
            var from = new MailAddress(_config["Smtp:User"] ?? "command@otakusdomain.com", "Otaku's Domain Interpool");
            var to = new MailAddress(recipientEmail, recipientName);

            var body = $@"
            <div style=""font-family: 'Courier New', monospace; background-color: #e8e4d8; padding: 24px; color: #000;"">
                <div style=""max-width: 520px; margin: 0 auto; background: #fff; border: 4px solid #000; padding: 24px; box-shadow: 8px 8px 0px #000;"">
                    <span style=""background: #facc15; color: #000; border: 2px solid #000; padding: 4px 8px; font-weight: 900; font-size: 11px; text-transform: uppercase;"">PRESALE VOUCHER CONFIRMATION</span>
                    <h1 style=""font-size: 26px; text-transform: uppercase; margin: 12px 0 4px 0; font-weight: 900;"">{eventTitle}</h1>
                    <p style=""font-size: 13px; font-weight: bold;"">OPERATIVE: {recipientName}</p>

                    <div style=""background: #fef08a; border: 3px solid #000; padding: 16px; margin: 20px 0; text-align: center;"">
                        <span style=""font-size: 32px;"">🏷</span>
                        <h2 style=""font-size: 22px; font-weight: 900; margin: 4px 0;"">₦{discountLocked:N0} DISCOUNT LOCKED</h2>
                        <p style=""font-size: 11px; font-weight: bold; margin: 0;"">Advance Voucher Paid: ₦{paidAmount:N0}</p>
                    </div>

                    <p style=""font-size: 12px; font-weight: bold; line-height: 1.5;"">
                        Your presale voucher reservation is locked in the Interpool ledger. When full admission tiers drop, this discount will be deducted from your ticket total.
                    </p>
                </div>
            </div>";

            var mail = new MailMessage(from, to)
            {
                Subject = $"[VOUCHER LOCKED] Presale Discount Confirmed for {eventTitle}",
                Body = body,
                IsBodyHtml = true
            };

            await client.SendMailAsync(mail);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email Error]: {ex.Message}");
        }
    }

    public async Task SendStoreOrderReceiptEmailAsync(string recipientEmail, string recipientName, string orderNumber, decimal totalAmount, decimal deliveryFee, string shippingAddress, string akureZone, string itemsSummary)
    {
        try
        {
            using var client = GetSmtpClient();
            var from = new MailAddress(_config["Smtp:User"] ?? "command@otakusdomain.com", "Otaku's Domain Store");
            var to = new MailAddress(recipientEmail, recipientName);

            var body = $@"
            <div style=""font-family: 'Courier New', monospace; background-color: #0d0d0d; padding: 24px; color: #fff;"">
                <div style=""max-width: 540px; margin: 0 auto; background: #141414; border: 2px solid #e11d48; padding: 24px;"">
                    <span style=""background: #e11d48; color: #fff; padding: 4px 8px; font-weight: 900; font-size: 10px; text-transform: uppercase;"">
                        オタクズ・ドメイン // ORDER CONFIRMED
                    </span>
                    <h1 style=""font-size: 24px; text-transform: uppercase; margin: 12px 0 4px 0; color: #fff;"">Order #{orderNumber}</h1>
                    <p style=""font-size: 12px; color: #a1a1aa; margin: 0 0 16px 0;"">Customer: {recipientName}</p>

                    <div style=""background: #1f1f23; border: 1px solid #3f3f46; padding: 14px; margin-bottom: 16px; font-size: 12px; line-height: 1.6;"">
                        <strong style=""color: #facc15; display: block; text-transform: uppercase; margin-bottom: 4px;"">Ordered Gear:</strong>
                        <div>{itemsSummary}</div>
                    </div>

                    <div style=""font-size: 12px; color: #d4d4d8; line-height: 1.6; border-top: 1px solid #27272a; padding-top: 12px;"">
                        <p>📍 <strong>ZONE:</strong> {akureZone} (Akure Only Delivery)</p>
                        <p>🏠 <strong>ADDRESS:</strong> {shippingAddress}</p>
                        <p>🚚 <strong>DISPATCH FEE:</strong> ₦{deliveryFee:N0}</p>
                        <p style=""font-size: 15px; color: #4ade80; font-weight: bold;"">💰 TOTAL PAID: ₦{totalAmount:N0}</p>
                    </div>
                </div>
            </div>";

            var mail = new MailMessage(from, to)
            {
                Subject = $"[ORDER CONFIRMED] Otaku's Domain Merch #{orderNumber}",
                Body = body,
                IsBodyHtml = true
            };

            await client.SendMailAsync(mail);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email Error]: {ex.Message}");
        }
    }

    public async Task SendStoreDeliveryUpdateEmailAsync(string recipientEmail, string recipientName, string orderNumber, string statusHeadline, string customNote, string shippingAddress, string akureZone, string? riderContact)
    {
        try
        {
            using var client = GetSmtpClient();
            var from = new MailAddress(_config["Smtp:User"] ?? "command@otakusdomain.com", "Otaku's Domain Dispatch Logistics");
            var to = new MailAddress(recipientEmail, recipientName);

            var riderInfoHtml = !string.IsNullOrWhiteSpace(riderContact)
                ? $@"<p style=""background: #27272a; padding: 8px 12px; border-left: 3px solid #3b82f6; margin-top: 12px;"">🏍 <strong>DISPATCH RIDER CONTACT:</strong> {riderContact}</p>"
                : string.Empty;

            var body = $@"
            <div style=""font-family: 'Courier New', monospace; background-color: #0d0d0d; padding: 24px; color: #fff;"">
                <div style=""max-width: 540px; margin: 0 auto; background: #141414; border: 2px solid #3b82f6; padding: 24px;"">
                    <span style=""background: #3b82f6; color: #fff; padding: 4px 8px; font-weight: 900; font-size: 10px; text-transform: uppercase;"">
                        物流更新 // DISPATCH TRANSMISSION
                    </span>
                    <h1 style=""font-size: 22px; text-transform: uppercase; margin: 12px 0 4px 0; color: #fff;"">{statusHeadline}</h1>
                    <p style=""font-size: 12px; color: #a1a1aa; margin: 0 0 16px 0;"">Order #{orderNumber} • Recipient: {recipientName}</p>

                    <div style=""background: #1e1e24; border: 1px solid #3f3f46; padding: 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; color: #facc15;"">
                        <strong>COMMUNICATION NOTE:</strong>
                        <p style=""margin: 6px 0 0 0; color: #fff;"">{customNote}</p>
                    </div>

                    <div style=""font-size: 12px; color: #d4d4d8; line-height: 1.6; border-top: 1px solid #27272a; padding-top: 12px;"">
                        <p>📍 <strong>DESTINATION ZONE:</strong> {akureZone}</p>
                        <p>🏠 <strong>DELIVERY ADDRESS:</strong> {shippingAddress}</p>
                        {riderInfoHtml}
                    </div>
                </div>
            </div>";

            var mail = new MailMessage(from, to)
            {
                Subject = $"[DISPATCH UPDATE] {statusHeadline} — Order #{orderNumber}",
                Body = body,
                IsBodyHtml = true
            };

            await client.SendMailAsync(mail);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Email Error]: {ex.Message}");
        }
    }
}