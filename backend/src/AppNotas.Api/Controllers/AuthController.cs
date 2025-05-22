using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AppNotas.Api.Models;
using AppNotas.Data;
using System.Linq;

namespace AppNotas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _cfg;
        private readonly AppNotasDbContext _context;

        public AuthController(IConfiguration cfg, AppNotasDbContext context)
        {
            _cfg = cfg;
            _context = context;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            try
            {
                // Validar usuario con EF
                var user = _context.Users
                    .FirstOrDefault(u => u.UserName == dto.UserName && u.Password == dto.Password);

                if (user == null)
                    return Unauthorized("Usuario o contraseña inválidos");

                // Generar JWT
                var claims = new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, dto.UserName),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                };

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    issuer: _cfg["Jwt:Issuer"],
                    audience: _cfg["Jwt:Issuer"],
                    claims: claims,
                    expires: DateTime.UtcNow.AddHours(2),
                    signingCredentials: creds
                );

                return Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno: {ex.Message}");
            }
        }
    }
}
